import { Button } from "@/components/ui/button";

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const DataPagination = ({ 
    page, totalPages, onPageChange 

}: Props) => {
    return ( 
        <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
            </div>
            <div className="flex items-center justify-end space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    className=""
                > Previous</Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages || totalPages === 0}
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    className=""
                >Next</Button>
            </div>
        </div>
    );
}
